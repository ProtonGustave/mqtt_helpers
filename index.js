function testTopicTemplate(topic, topicTemplate) {
  // Test if topic template suits topic
  // e.g.
  // template:
  // test/{name}/topic (or test/+/topic, or test/#)
  // topic:
  // test/super/topic

  // find topic(s) client want to subscribe
  const topicSections = topic.split('/');
  const topicTemplateSections = topicTemplate.split('/');

  if (topicSections.length < topicTemplateSections.length) {
    return false;
  }

  const templateSections = [];

  topicTemplateSections.forEach((section, id) => {
    // collect ids of template sections(like {exchange} and +)
    if (
      (section.startsWith('{') && section.endsWith('}'))
      || section === '+'
    ) {
      templateSections.push(id);
    }
  });

  for (const [id, section] of topicSections.entries()) {
    const templateSection = topicTemplateSections[id];

    if (templateSection === '#') {
      if (id !== (topicTemplateSections.length - 1)) {
        throw new Error('# could only be last wildcard');
      }

      return true;
    }

    // compare sections
    if (templateSections.indexOf(id) !== -1) {
      // template section, skip it
      continue;
    }

    if (section !== templateSection) {
      return false;
    }
  }

  return true;
};

function fillTemplate(template, filling) {
  for (const [templateSection, replacement] of Object.entries(filling)) {
    template = template.replace(`{${templateSection}}`, replacement);
    // optional section
    template = template.replace(`{?${templateSection}}`, replacement);
  }

  // replace rest optional sections with none
  template = template.replace(/\/?\{\?.+?}/g, 'none');

  return template;
}

// TODO: add optional section support?
function extractFilling(topic, topicTemplate) {
  if (testTopicTemplate(topic, topicTemplate) === false) {
    return false;
  }

  const filling = {};
  const topicSections = topic.split('/');
  const topicTemplateSections = topicTemplate.split('/');

  topicTemplateSections.forEach((section, id) => {
    if (section.startsWith('{') && section.endsWith('}')) {
      const sectionName = section.slice(1, -1);
      filling[sectionName] = topicSections[id];
    }

    if (section === '+') {
      if (filling.plus === void 0) {
        filling.plus = [];
      }

      filling.plus.push(topicSections[id]);
    }

    if (section === '#') {
      filling.sharp = topicSections.slice(id); 
    }
  });

  return filling;
}

// test a set of topic templates
// "templates" arg should be an iterable object that returns array [id<Any>, template<String>] 
// testTemplates yield this array if template is correct
// --------
// examples:
// 1. input: ('test/apple', (['test/{fruit}', 'test/{fruit}/extra']).entries())
//    output: [0, 'test/{fruit}']
// 2. input: ('test/apple', Object.entries({ simpleTopic: 'test/{fruit}', fancyTopic: 'test/{fruit}/extra' }))
//    output: ['simpleTopic', 'test/{fruit}']
function* testTemplates(topic, templates) {
  for (const [id, template] of templates) {
    if (testTopicTemplate(topic, template) === true) {
      yield [id, template];
    }
  }
}

// same as above as "templates" could be nested, i.e. could contain
// objects and arrays with templates, like
// [
//  [0, "simple/{template}"], 
//  [1, [
//      "nested/array/{template}",
//      "second_nested/{template}",
//    ]
//  ],
//  [2, {
//      "key": "nested/object/{template}",
//    }
//  ]
// ]
//    
// yielded array first element(id) will be an array itself and contain a path
// to template, example results:
// [[0], "simple/{template}"]
// [[1, 0], "nested/array/{template}"]
// [[2, "key"], "nested/object/{template}"]
function* testNestedTemplates(topic, templates) {
  for (const [id, template] of templates) {
    let templatePath = id;
    if (templatePath instanceof Array === false || templatePath._templatePath !== true) {
      templatePath = [id];
      Object.defineProperty(templatePath, '_templatePath', {
        value: true,
        enumerable: false,
      });
    }

    if (typeof template === 'object') {
      let nestedTemplates;

      if (nestedTemplates instanceof Array === true) {
        nestedTemplates = Array.from(template.entries());
      }
      else {
        nestedTemplates = Object.entries(template);
      }

      nestedTemplates = nestedTemplates.map((v) => {
        const path = [...templatePath, v[0]];
        Object.defineProperty(path, '_templatePath', {
          value: true,
          enumerable: false,
        });
        return [path, v[1]];
      });

      yield* testNestedTemplates(topic, nestedTemplates);
    }
    else {
      if (testTopicTemplate(topic, template) === true) {
        yield [templatePath, template];
      }
    }
  }
}

function getTopicOnce(client, subTopic, cb) {
  const onMessage = (topic, msg, packet) => {
    if (testTopicTemplate(topic, subTopic) === false) {
      return;
    }

    client.unsubscribe(subTopic);
    client.off('message', onMessage);
    cb(topic, msg, packet);
  };

  client.on('message', onMessage);
  client.subscribe(subTopic);
}

function replaceTopicSections(template, replaceWith) {
  // replace all topic sections with some value
  return template.replace(/{.*?}/g, replaceWith);
}

module.exports = {
  testTopicTemplate,
  fillTemplate,
  extractFilling,
  testTemplates,
  testNestedTemplates,
  getTopicOnce,
  replaceTopicSections,
};
